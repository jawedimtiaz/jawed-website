import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  PiggyBank,
  Plus,
  TrendingUp,
  AlertTriangle,
  Trash2,
  ArrowUpCircle,
  CalendarClock,
  Repeat,
  PauseCircle,
  PlayCircle,
  Clock,
  ArrowRight,
  BarChart3,
  BellRing,
  CheckCircle2,
  RotateCcw,
  Palette,
  Target,
  Minus,
} from 'lucide-react';
import {
  INITIAL_CATEGORIES,
  calculateCategoryBreakdown,
  calculateSixMonthTrend,
  formatINR,
  saveCategory as dbSaveCategory,
  deleteCategory as dbDeleteCategory,
  type CategoryBreakdownItem,
  type MoneyCategory,
  type MonthlyMetrics,
  type MoneyTransaction,
  type SinkingFund,
  type RecurringRule,
  type AccountSummary,
} from '../../db/db';
import { CategoryManager } from './CategoryManager';

export type StatsSubView = 'all' | 'budgets' | 'analytics' | 'categories' | 'scheduled';

export interface MonthlyBudgetPlanItem {
  categoryId: string;
  category: string;
  color: string;
  iconName: string;
  defaultFixedOrVariable: 'Fixed' | 'Variable';
  monthlyLimit: number;
  spent: number;
  txCount: number;
  remaining: number;
  overage: number;
  utilizationPercent: number;
  shareOfTotalBudgetPercent: number;
  dailySafeSpend: number;
  status: 'over' | 'near' | 'on-track' | 'unbudgeted';
}

export interface MonthlyBudgetPlanSummary {
  items: MonthlyBudgetPlanItem[];
  totalBudgeted: number;
  totalSpent: number;
  totalRemaining: number;
  totalOverage: number;
  overallUtilizationPercent: number;
  overBudgetCount: number;
  nearLimitCount: number;
  onTrackCount: number;
  unbudgetedCount: number;
  fixedBudgeted: number;
  fixedSpent: number;
  fixedUtilizationPercent: number;
  variableBudgeted: number;
  variableSpent: number;
  variableUtilizationPercent: number;
}

export type BudgetSortOption = 'utilization-desc' | 'spent-desc' | 'limit-desc' | 'name-asc';

export interface StatsViewProps {
  selectedMonth: string;
  transactions: MoneyTransaction[];
  metrics: MonthlyMetrics;
  sinkingFunds: SinkingFund[];
  categories?: MoneyCategory[];
  recurringRules?: RecurringRule[];
  accounts?: AccountSummary[];
  onSaveCategory?: (category: MoneyCategory) => Promise<void>;
  onDeleteCategory?: (id: string) => Promise<void>;
  onSaveSinkingFund: (fund: SinkingFund) => Promise<void>;
  onDeleteSinkingFund: (id: string) => Promise<void>;
  onToggleRecurringRule?: (rule: RecurringRule) => Promise<void>;
  onDeleteRecurringRule?: (id: string) => Promise<void>;
  onOpenRecurringScheduler?: () => void;
}

/**
 * Pure helper that computes the monthly budget plan and real-time spending progress
 * across all Expense categories for the selected month.
 */
export function computeMonthlyBudgetPlan(
  transactions: MoneyTransaction[],
  selectedMonth: string,
  categories: MoneyCategory[] = INITIAL_CATEGORIES,
  thresholdOverrides?: Record<string, number> | number
): MonthlyBudgetPlanSummary {
  const spentByCategory = new Map<
    string,
    { spent: number; txCount: number; fixedOrVariable: 'Fixed' | 'Variable' }
  >();

  for (const tx of transactions) {
    if (tx.type !== 'Expense' || !tx.date.startsWith(selectedMonth)) continue;
    const prev = spentByCategory.get(tx.category) ?? {
      spent: 0,
      txCount: 0,
      fixedOrVariable: tx.fixedOrVariable,
    };
    prev.spent += tx.amount;
    prev.txCount += 1;
    spentByCategory.set(tx.category, prev);
  }

  const expenseCategories: MoneyCategory[] = categories.filter((c) => c.type === 'Expense');
  const seenNames = new Set(expenseCategories.map((c) => c.name));

  // Include any ad-hoc expense category present in transactions but not in categories store
  for (const [catName, stats] of spentByCategory.entries()) {
    if (!seenNames.has(catName)) {
      seenNames.add(catName);
      expenseCategories.push({
        id: `cat-adhoc-${catName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        name: catName,
        type: 'Expense',
        defaultFixedOrVariable: stats.fixedOrVariable,
        iconName: 'Tag',
        color: '#06b6d4',
        subCategories: [],
      });
    }
  }

  let totalBudgeted = 0;
  let totalSpent = 0;
  let totalRemaining = 0;
  let totalOverage = 0;
  let overBudgetCount = 0;
  let nearLimitCount = 0;
  let onTrackCount = 0;
  let unbudgetedCount = 0;
  let fixedBudgeted = 0;
  let fixedSpent = 0;
  let variableBudgeted = 0;
  let variableSpent = 0;

  const items: MonthlyBudgetPlanItem[] = expenseCategories.map((cat) => {
    const stats = spentByCategory.get(cat.name);
    const spent = stats?.spent ?? 0;
    const txCount = stats?.txCount ?? 0;

    let monthlyLimit = 0;
    if (typeof thresholdOverrides === 'number' && thresholdOverrides > 0) {
      monthlyLimit = thresholdOverrides;
    } else if (
      thresholdOverrides &&
      typeof thresholdOverrides === 'object' &&
      typeof thresholdOverrides[cat.name] === 'number'
    ) {
      monthlyLimit = Math.max(0, thresholdOverrides[cat.name]);
    } else if (typeof cat.monthlyBudget === 'number' && cat.monthlyBudget > 0) {
      monthlyLimit = cat.monthlyBudget;
    }

    const remaining = monthlyLimit > 0 ? Math.max(0, monthlyLimit - spent) : 0;
    const overage = monthlyLimit > 0 && spent > monthlyLimit ? spent - monthlyLimit : 0;
    const utilizationPercent =
      monthlyLimit > 0 ? Number(((spent / monthlyLimit) * 100).toFixed(1)) : 0;

    let status: MonthlyBudgetPlanItem['status'] = 'unbudgeted';
    if (monthlyLimit <= 0) {
      status = 'unbudgeted';
      unbudgetedCount += 1;
    } else if (spent > monthlyLimit) {
      status = 'over';
      overBudgetCount += 1;
    } else if (utilizationPercent >= 85) {
      status = 'near';
      nearLimitCount += 1;
    } else {
      status = 'on-track';
      onTrackCount += 1;
    }

    totalBudgeted += monthlyLimit;
    totalSpent += spent;
    totalRemaining += remaining;
    totalOverage += overage;

    if (cat.defaultFixedOrVariable === 'Fixed') {
      fixedBudgeted += monthlyLimit;
      fixedSpent += spent;
    } else {
      variableBudgeted += monthlyLimit;
      variableSpent += spent;
    }

    return {
      categoryId: cat.id,
      category: cat.name,
      color: cat.color || '#06b6d4',
      iconName: cat.iconName || 'Tag',
      defaultFixedOrVariable: cat.defaultFixedOrVariable,
      monthlyLimit,
      spent,
      txCount,
      remaining,
      overage,
      utilizationPercent,
      shareOfTotalBudgetPercent: 0,
      dailySafeSpend: Math.round(remaining / 10),
      status,
    };
  });

  for (const item of items) {
    item.shareOfTotalBudgetPercent =
      totalBudgeted > 0
        ? Number(((item.monthlyLimit / totalBudgeted) * 100).toFixed(1))
        : 0;
  }

  const overallUtilizationPercent =
    totalBudgeted > 0 ? Number(((totalSpent / totalBudgeted) * 100).toFixed(1)) : 0;
  const fixedUtilizationPercent =
    fixedBudgeted > 0 ? Number(((fixedSpent / fixedBudgeted) * 100).toFixed(1)) : 0;
  const variableUtilizationPercent =
    variableBudgeted > 0 ? Number(((variableSpent / variableBudgeted) * 100).toFixed(1)) : 0;

  return {
    items,
    totalBudgeted,
    totalSpent,
    totalRemaining,
    totalOverage,
    overallUtilizationPercent,
    overBudgetCount,
    nearLimitCount,
    onTrackCount,
    unbudgetedCount,
    fixedBudgeted,
    fixedSpent,
    fixedUtilizationPercent,
    variableBudgeted,
    variableSpent,
    variableUtilizationPercent,
  };
}

/**
 * Pure helper that allocates a 50/30/20 monthly budget plan (50% Fixed, 30% Variable, 20% Savings)
 * from the month's total income across all Expense categories, weighted by baseline or current spend.
 */
export function computeIncomeBasedBudgetAllocation(
  monthlyIncome: number,
  items: MonthlyBudgetPlanItem[]
): Record<string, number> {
  const safeIncome = Math.max(50000, monthlyIncome || 0);
  const fixedPool = safeIncome * 0.5;
  const variablePool = safeIncome * 0.3;

  const fixedItems = items.filter((i) => i.defaultFixedOrVariable === 'Fixed');
  const variableItems = items.filter((i) => i.defaultFixedOrVariable === 'Variable');

  const fixedWeightSum =
    fixedItems.reduce((sum, i) => sum + Math.max(1000, i.spent || i.monthlyLimit || 3000), 0) || 1;
  const variableWeightSum =
    variableItems.reduce((sum, i) => sum + Math.max(1000, i.spent || i.monthlyLimit || 2000), 0) ||
    1;

  const result: Record<string, number> = {};

  for (const item of fixedItems) {
    const weight = Math.max(1000, item.spent || item.monthlyLimit || 3000);
    const rawShare = (fixedPool * weight) / fixedWeightSum;
    result[item.category] = Math.max(1000, Math.round(rawShare / 500) * 500);
  }

  for (const item of variableItems) {
    const weight = Math.max(1000, item.spent || item.monthlyLimit || 2000);
    const rawShare = (variablePool * weight) / variableWeightSum;
    result[item.category] = Math.max(1000, Math.round(rawShare / 500) * 500);
  }

  return result;
}

/**
 * Pure helper that evaluates monthly category spending against user-defined thresholds
 * and returns the enriched breakdown (including custom category colors) along with exceeded and near-limit categories.
 */
export function evaluateCategoryBudgetAlerts(
  transactions: MoneyTransaction[],
  selectedMonth: string,
  categoriesOrThresholds?: MoneyCategory[] | Record<string, number> | number,
  customCategoriesOrColors?: MoneyCategory[] | Record<string, string>
): {
  breakdown: CategoryBreakdownItem[];
  exceededCategories: CategoryBreakdownItem[];
  nearLimitCategories: CategoryBreakdownItem[];
  totalOverBudgetAmount: number;
  alertSeverity: 'critical' | 'warning' | 'healthy';
  highestOverageCategory: CategoryBreakdownItem | null;
} {
  const breakdown = calculateCategoryBreakdown(
    transactions,
    selectedMonth,
    categoriesOrThresholds,
    customCategoriesOrColors
  );
  const exceededCategories = breakdown.filter((item) => Boolean(item.isOverBudget));
  const nearLimitCategories = breakdown.filter(
    (item) =>
      !item.isOverBudget &&
      typeof item.budgetUtilizationPercent === 'number' &&
      item.budgetUtilizationPercent >= 85
  );

  const totalOverBudgetAmount = exceededCategories.reduce(
    (sum, item) => sum + (item.overBudgetAmount || 0),
    0
  );

  const highestOverageCategory =
    exceededCategories.length > 0
      ? [...exceededCategories].sort(
          (a, b) => (b.overBudgetAmount || 0) - (a.overBudgetAmount || 0)
        )[0]
      : null;

  const alertSeverity: 'critical' | 'warning' | 'healthy' =
    exceededCategories.length > 0
      ? 'critical'
      : nearLimitCategories.length > 0
      ? 'warning'
      : 'healthy';

  return {
    breakdown,
    exceededCategories,
    nearLimitCategories,
    totalOverBudgetAmount,
    alertSeverity,
    highestOverageCategory,
  };
}

export const StatsView: React.FC<StatsViewProps> = ({
  selectedMonth,
  transactions,
  metrics,
  sinkingFunds,
  categories = INITIAL_CATEGORIES,
  recurringRules = [],
  accounts = [],
  onSaveCategory,
  onDeleteCategory,
  onSaveSinkingFund,
  onDeleteSinkingFund,
  onToggleRecurringRule,
  onDeleteRecurringRule,
  onOpenRecurringScheduler,
}) => {
  const [subView, setSubView] = useState<StatsSubView>('all');
  const [budgetFilterStatus, setBudgetFilterStatus] = useState<
    'all' | 'over' | 'near' | 'on-track' | 'unbudgeted'
  >('all');
  const [budgetSearchQuery, setBudgetSearchQuery] = useState<string>('');
  const [budgetSortBy, setBudgetSortBy] = useState<BudgetSortOption>('utilization-desc');
  const [showBudgetComparisonChart, setShowBudgetComparisonChart] = useState<boolean>(true);
  const [showPausedRules, setShowPausedRules] = useState<boolean>(false);
  const [barChartMode, setBarChartMode] = useState<'category' | 'trend'>('category');
  const [localCategories, setLocalCategories] = useState<MoneyCategory[]>(categories);

  // User-defined budget alert thresholds per category + optional uniform threshold override
  const [categoryThresholds, setCategoryThresholds] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const cat of categories) {
      if (cat.type === 'Expense' && typeof cat.monthlyBudget === 'number' && cat.monthlyBudget > 0) {
        initial[cat.name] = cat.monthlyBudget;
      }
    }
    return initial;
  });
  const [uniformThresholdInput, setUniformThresholdInput] = useState<string>('');

  useEffect(() => {
    setLocalCategories(categories);
    setCategoryThresholds((prev) => {
      const next: Record<string, number> = { ...prev };
      for (const cat of categories) {
        if (cat.type === 'Expense' && typeof cat.monthlyBudget === 'number' && cat.monthlyBudget > 0) {
          next[cat.name] = cat.monthlyBudget;
        }
      }
      return next;
    });
  }, [categories]);

  const [showAddFund, setShowAddFund] = useState(false);
  const [fundName, setFundName] = useState('');
  const [fundTarget, setFundTarget] = useState('50000');
  const [fundMonthly, setFundMonthly] = useState('4000');
  const [fundAccrued, setFundAccrued] = useState('10000');

  const activeThresholdConfig = useMemo<Record<string, number> | number>(() => {
    const uniformVal = Number.parseFloat(uniformThresholdInput);
    if (!Number.isNaN(uniformVal) && uniformVal > 0) {
      return uniformVal;
    }
    return categoryThresholds;
  }, [uniformThresholdInput, categoryThresholds]);

  const {
    breakdown: categoryBreakdown,
    exceededCategories,
    nearLimitCategories,
    totalOverBudgetAmount,
    alertSeverity,
  } = useMemo(
    () =>
      evaluateCategoryBudgetAlerts(
        transactions,
        selectedMonth,
        activeThresholdConfig,
        localCategories
      ),
    [transactions, selectedMonth, activeThresholdConfig, localCategories]
  );

  const monthlyBudgetPlan = useMemo(
    () =>
      computeMonthlyBudgetPlan(
        transactions,
        selectedMonth,
        localCategories,
        activeThresholdConfig
      ),
    [transactions, selectedMonth, localCategories, activeThresholdConfig]
  );

  const filteredBudgetPlanItems = useMemo(() => {
    const cleanQuery = budgetSearchQuery.trim().toLowerCase();
    const list = monthlyBudgetPlan.items.filter((item) => {
      if (budgetFilterStatus !== 'all' && item.status !== budgetFilterStatus) {
        return false;
      }
      if (cleanQuery) {
        const matchesName = item.category.toLowerCase().includes(cleanQuery);
        const matchesType = item.defaultFixedOrVariable.toLowerCase().includes(cleanQuery);
        return matchesName || matchesType;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (budgetSortBy === 'utilization-desc') {
        return b.utilizationPercent - a.utilizationPercent || b.spent - a.spent;
      }
      if (budgetSortBy === 'spent-desc') {
        return b.spent - a.spent || b.monthlyLimit - a.monthlyLimit;
      }
      if (budgetSortBy === 'limit-desc') {
        return b.monthlyLimit - a.monthlyLimit || b.spent - a.spent;
      }
      return a.category.localeCompare(b.category);
    });
  }, [monthlyBudgetPlan.items, budgetFilterStatus, budgetSearchQuery, budgetSortBy]);

  const handleSaveCategoryState = async (updatedCat: MoneyCategory) => {
    setLocalCategories((prev) => {
      const exists = prev.some((c) => c.id === updatedCat.id);
      if (exists) {
        return prev.map((c) => (c.id === updatedCat.id ? updatedCat : c));
      }
      return [...prev, updatedCat];
    });
    if (typeof updatedCat.monthlyBudget === 'number' && updatedCat.monthlyBudget > 0) {
      setCategoryThresholds((prev) => ({
        ...prev,
        [updatedCat.name]: updatedCat.monthlyBudget!,
      }));
    }
    if (onSaveCategory) {
      await onSaveCategory(updatedCat);
    } else {
      await dbSaveCategory(updatedCat);
    }
  };

  const handleDeleteCategoryState = async (id: string) => {
    setLocalCategories((prev) => prev.filter((c) => c.id !== id));
    if (onDeleteCategory) {
      await onDeleteCategory(id);
    } else {
      await dbDeleteCategory(id);
    }
  };

  const handleInlineCategoryColorChange = async (categoryName: string, nextColor: string) => {
    const existingCat = localCategories.find((c) => c.name === categoryName);
    if (existingCat) {
      await handleSaveCategoryState({
        ...existingCat,
        color: nextColor,
      });
    }
  };

  const handleCategoryThresholdChange = async (categoryName: string, rawValue: string) => {
    const parsed = Math.max(0, Number.parseFloat(rawValue) || 0);
    setUniformThresholdInput('');
    setCategoryThresholds((prev) => ({
      ...prev,
      [categoryName]: parsed,
    }));

    const existingCat = localCategories.find((c) => c.name === categoryName);
    if (existingCat) {
      await handleSaveCategoryState({
        ...existingCat,
        monthlyBudget: parsed > 0 ? parsed : undefined,
      });
    }
  };

  const handleStepCategoryBudget = async (categoryName: string, currentLimit: number, delta: number) => {
    const nextLimit = Math.max(0, currentLimit + delta);
    await handleCategoryThresholdChange(categoryName, String(nextLimit));
  };

  const handleAutoAllocateWithBuffer = async () => {
    setUniformThresholdInput('');
    const nextThresholds: Record<string, number> = { ...categoryThresholds };

    for (const item of monthlyBudgetPlan.items) {
      const targetLimit =
        item.spent > 0
          ? Math.ceil((item.spent * 1.1) / 500) * 500
          : item.monthlyLimit > 0
          ? item.monthlyLimit
          : 3000;
      nextThresholds[item.category] = targetLimit;

      const existingCat = localCategories.find((c) => c.name === item.category);
      if (existingCat) {
        await handleSaveCategoryState({
          ...existingCat,
          monthlyBudget: targetLimit,
        });
      }
    }
    setCategoryThresholds(nextThresholds);
  };

  const handleAutoAllocate503020 = async () => {
    setUniformThresholdInput('');
    const allocated = computeIncomeBasedBudgetAllocation(
      metrics.income,
      monthlyBudgetPlan.items
    );
    const nextThresholds: Record<string, number> = {
      ...categoryThresholds,
      ...allocated,
    };
    setCategoryThresholds(nextThresholds);

    for (const item of monthlyBudgetPlan.items) {
      const targetLimit = allocated[item.category];
      const existingCat = localCategories.find((c) => c.name === item.category);
      if (existingCat && typeof targetLimit === 'number' && targetLimit > 0) {
        await handleSaveCategoryState({
          ...existingCat,
          monthlyBudget: targetLimit,
        });
      }
    }
  };

  const handleApplyUniformThresholdToAll = async () => {
    const parsed = Math.max(0, Number.parseFloat(uniformThresholdInput) || 0);
    if (parsed <= 0) return;

    const updatedMap: Record<string, number> = { ...categoryThresholds };
    for (const item of categoryBreakdown) {
      updatedMap[item.category] = parsed;
    }
    for (const cat of localCategories) {
      if (cat.type === 'Expense') {
        updatedMap[cat.name] = parsed;
      }
    }
    setCategoryThresholds(updatedMap);

    for (const cat of localCategories) {
      if (cat.type === 'Expense') {
        await handleSaveCategoryState({
          ...cat,
          monthlyBudget: parsed,
        });
      }
    }
  };

  const handleResetDefaultThresholds = async () => {
    setUniformThresholdInput('');
    const defaults: Record<string, number> = {};
    for (const cat of INITIAL_CATEGORIES) {
      if (cat.type === 'Expense' && typeof cat.monthlyBudget === 'number') {
        defaults[cat.name] = cat.monthlyBudget;
      }
    }
    setCategoryThresholds(defaults);

    for (const cat of INITIAL_CATEGORIES) {
      if (cat.type === 'Expense') {
        await handleSaveCategoryState(cat);
      }
    }
  };

  const sixMonthTrend = useMemo(
    () => calculateSixMonthTrend(transactions, selectedMonth),
    [transactions, selectedMonth]
  );

  const accountMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const acc of accounts) {
      map.set(acc.id, acc.name);
    }
    return map;
  }, [accounts]);

  const activeRecurringRules = useMemo(
    () => recurringRules.filter((rule) => rule.active),
    [recurringRules]
  );

  const displayedRecurringRules = useMemo(() => {
    const list = showPausedRules ? recurringRules : activeRecurringRules;
    return [...list].sort((a, b) => a.nextRunDate.localeCompare(b.nextRunDate));
  }, [recurringRules, activeRecurringRules, showPausedRules]);

  const handleAddMonthlyContribution = async (fund: SinkingFund) => {
    const nextAccrued = Math.min(fund.targetAmount, fund.currentAccrued + fund.monthlyTarget);
    await onSaveSinkingFund({
      ...fund,
      currentAccrued: nextAccrued,
    });
  };

  const handleCreateFund = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = fundName.trim();
    if (!cleanName) return;

    const target = Math.max(1000, Number.parseFloat(fundTarget) || 50000);
    const monthly = Math.max(100, Number.parseFloat(fundMonthly) || 4000);
    const accrued = Math.max(0, Number.parseFloat(fundAccrued) || 0);

    await onSaveSinkingFund({
      id: `sf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: cleanName,
      targetAmount: target,
      monthlyTarget: monthly,
      currentAccrued: accrued,
    });

    setFundName('');
    setFundTarget('50000');
    setFundMonthly('4000');
    setFundAccrued('0');
    setShowAddFund(false);
  };

  const showBudgetPlanningSection = subView === 'all' || subView === 'budgets';
  const showAnalyticsSections = subView === 'all' || subView === 'analytics';
  const showCategoriesSection = subView === 'all' || subView === 'analytics' || subView === 'categories';
  const showScheduledSection = subView === 'all' || subView === 'scheduled';

  const unallocatedIncome = Math.max(0, metrics.income - monthlyBudgetPlan.totalBudgeted);

  return (
    <section
      className="mm-view-section"
      aria-label="Statistics, Analytics, Sinking Funds & Scheduled Transactions"
    >
      {/* Stats & Budgets View Switcher Bar */}
      <div
        className="mm-filter-bar"
        data-testid="mm-stats-subview-bar"
        style={{ padding: '12px 16px' }}
      >
        <div className="mm-stat-panel-header" style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <BarChart3 size={17} style={{ color: 'var(--accent)' }} />
            <strong>Stats &amp; Budgets Views</strong>
            <span className="mm-stat-panel-sub" style={{ margin: 0 }}>
              ({exceededCategories.length} budget{' '}
              {exceededCategories.length === 1 ? 'alert' : 'alerts'} ·{' '}
              {activeRecurringRules.length} active scheduled rules · {sinkingFunds.length} sinking
              funds)
            </span>
          </div>

          <div
            role="group"
            aria-label="Select Stats & Budgets Sub-View"
            style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}
          >
            <button
              type="button"
              onClick={() => setSubView('all')}
              className={`mm-btn mm-btn-sm ${
                subView === 'all' ? 'mm-btn-primary' : 'mm-btn-secondary'
              }`}
              data-testid="mm-stats-view-all-btn"
            >
              Overview (All)
            </button>
            <button
              type="button"
              onClick={() => setSubView('budgets')}
              className={`mm-btn mm-btn-sm ${
                subView === 'budgets' ? 'mm-btn-primary' : 'mm-btn-secondary'
              }`}
              data-testid="mm-stats-view-budgets-btn"
            >
              <Target size={14} />
              <span>Monthly Budget Plan ({monthlyBudgetPlan.overallUtilizationPercent}%)</span>
            </button>
            <button
              type="button"
              onClick={() => setSubView('analytics')}
              className={`mm-btn mm-btn-sm ${
                subView === 'analytics' ? 'mm-btn-primary' : 'mm-btn-secondary'
              }`}
              data-testid="mm-stats-view-analytics-btn"
            >
              Charts &amp; Sinking Funds
            </button>
            <button
              type="button"
              onClick={() => setSubView('categories')}
              className={`mm-btn mm-btn-sm ${
                subView === 'categories' ? 'mm-btn-primary' : 'mm-btn-secondary'
              }`}
              data-testid="mm-stats-view-categories-btn"
            >
              <Palette size={14} />
              <span>Category Manager ({localCategories.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setSubView('scheduled')}
              className={`mm-btn mm-btn-sm ${
                subView === 'scheduled' ? 'mm-btn-primary' : 'mm-btn-secondary'
              }`}
              data-testid="mm-stats-view-scheduled-btn"
            >
              <CalendarClock size={14} />
              <span>Scheduled Transactions ({activeRecurringRules.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Real-Time Visual Budget Alert System Center */}
      {(exceededCategories.length > 0 || nearLimitCategories.length > 0) && (
        <article
          className="mm-stat-panel"
          role="region"
          aria-label="Visual Budget Alert System"
          data-testid="mm-visual-alert-system"
          data-alert-severity={alertSeverity}
          style={{
            marginBottom: '12px',
            border:
              exceededCategories.length > 0
                ? '1.5px solid rgba(239, 68, 68, 0.55)'
                : '1.5px solid rgba(245, 158, 11, 0.5)',
            background:
              exceededCategories.length > 0
                ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(15, 23, 42, 0.02))'
                : 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(15, 23, 42, 0.02))',
          }}
        >
          <div className="mm-stat-panel-header" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background:
                    exceededCategories.length > 0
                      ? 'rgba(239, 68, 68, 0.16)'
                      : 'rgba(245, 158, 11, 0.16)',
                  color: exceededCategories.length > 0 ? '#ef4444' : '#f59e0b',
                }}
                data-testid="mm-visual-alert-header-icon"
              >
                <AlertTriangle size={18} />
              </span>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <h2 className="mm-stat-panel-title" style={{ margin: 0 }}>
                    Budget Alert Monitor ({selectedMonth})
                  </h2>
                  {exceededCategories.length > 0 && (
                    <span
                      className="mm-budget-alert-count-pill is-danger"
                      data-testid="mm-visual-alert-over-pill"
                    >
                      <AlertTriangle size={12} />
                      <span>
                        {exceededCategories.length}{' '}
                        {exceededCategories.length === 1
                          ? 'Category Over Budget'
                          : 'Categories Over Budget'}
                      </span>
                    </span>
                  )}
                  {nearLimitCategories.length > 0 && (
                    <span
                      className="mm-budget-status-pill is-near"
                      data-testid="mm-visual-alert-near-pill"
                    >
                      <span>{nearLimitCategories.length} Near Limit (≥85%)</span>
                    </span>
                  )}
                </div>
                <p className="mm-section-desc" style={{ margin: '3px 0 0' }}>
                  {exceededCategories.length > 0 ? (
                    <>
                      Monthly spending has exceeded planned thresholds by{' '}
                      <strong style={{ color: '#ef4444' }} data-testid="mm-visual-alert-total-overage">
                        +{formatINR(totalOverBudgetAmount)}
                      </strong>
                      . Adjust limits below or click a quick-resolve action.
                    </>
                  ) : (
                    <>
                      All categories are within limits, but {nearLimitCategories.length}{' '}
                      {nearLimitCategories.length === 1 ? 'category is' : 'categories are'}{' '}
                      approaching 85%+ utilization.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {exceededCategories.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSubView('budgets');
                    setBudgetFilterStatus('over');
                  }}
                  className="mm-btn mm-btn-sm mm-btn-secondary"
                  data-testid="mm-visual-alert-isolate-over-btn"
                >
                  <AlertTriangle size={13} style={{ color: '#ef4444' }} />
                  <span>Filter Over-Budget ({exceededCategories.length})</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleAutoAllocateWithBuffer}
                className="mm-btn mm-btn-sm mm-btn-primary"
                title="Automatically raise exceeded limits to cover current spend + 10% buffer"
                data-testid="mm-visual-alert-autofit-btn"
              >
                <TrendingUp size={13} />
                <span>Resolve All (+10% Buffer)</span>
              </button>
            </div>
          </div>

          {/* Over-Budget Category Warning Cards */}
          {exceededCategories.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(265px, 1fr))',
                gap: 10,
                marginBottom: nearLimitCategories.length > 0 ? 10 : 0,
              }}
              data-testid="mm-visual-alert-cards-grid"
            >
              {exceededCategories.map((item) => {
                const limit = item.monthlyBudget || 0;
                const overage = item.overBudgetAmount || Math.max(0, item.amount - limit);
                const utilPct =
                  item.budgetUtilizationPercent ??
                  (limit > 0 ? Number(((item.amount / limit) * 100).toFixed(1)) : 100);
                const roundedMatch = Math.ceil(item.amount / 500) * 500;

                return (
                  <div
                    key={item.category}
                    role="alert"
                    data-testid={`mm-visual-alert-card-${item.category}`}
                    data-over-budget="true"
                    style={{
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: '1px solid rgba(239, 68, 68, 0.45)',
                      background: 'rgba(239, 68, 68, 0.06)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span
                          className="mm-color-swatch"
                          style={{ backgroundColor: item.color, width: 11, height: 11 }}
                        />
                        <strong style={{ fontSize: '0.92rem', color: 'var(--text-heading)' }}>
                          {item.category}
                        </strong>
                      </div>

                      <span
                        className="mm-budget-alert-badge is-over"
                        data-testid={`mm-visual-warning-indicator-${item.category}`}
                      >
                        <AlertTriangle size={12} />
                        <span>OVER BY {formatINR(overage)}</span>
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        justifyContent: 'space-between',
                        fontSize: '0.82rem',
                      }}
                    >
                      <span>
                        Spent: <strong className="mm-text-expense">{formatINR(item.amount)}</strong>{' '}
                        of <strong>{formatINR(limit)}</strong> budget
                      </span>
                      <strong style={{ color: '#ef4444' }}>{utilPct}% used</strong>
                    </div>

                    <div className="mm-budget-progress-track" style={{ height: 7 }}>
                      <div
                        className="mm-budget-progress-fill"
                        style={{
                          width: '100%',
                          backgroundColor: '#ef4444',
                        }}
                      />
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 6,
                        flexWrap: 'wrap',
                        marginTop: 2,
                      }}
                    >
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                        Quick threshold adjustment:
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() =>
                            handleStepCategoryBudget(item.category, limit, 1000)
                          }
                          className="mm-btn mm-btn-sm mm-btn-secondary"
                          style={{ padding: '2px 8px', fontSize: '0.74rem' }}
                          data-testid={`mm-alert-bump-limit-${item.category}`}
                        >
                          +₹1,000 Limit
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleCategoryThresholdChange(item.category, String(roundedMatch))
                          }
                          className="mm-btn mm-btn-sm mm-btn-primary"
                          style={{ padding: '2px 8px', fontSize: '0.74rem' }}
                          data-testid={`mm-alert-resolve-match-${item.category}`}
                        >
                          Match Spend ({formatINR(roundedMatch)})
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Near-Limit Category Warning Strip */}
          {nearLimitCategories.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap',
                paddingTop: exceededCategories.length > 0 ? 6 : 0,
              }}
              data-testid="mm-visual-near-limit-list"
            >
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#f59e0b',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <AlertTriangle size={13} />
                Approaching Budget Limit (≥85%):
              </span>
              {nearLimitCategories.map((item) => (
                <span
                  key={item.category}
                  className="mm-budget-status-pill is-near"
                  data-testid={`mm-visual-near-chip-${item.category}`}
                >
                  <strong>{item.category}:</strong> {formatINR(item.amount)} /{' '}
                  {formatINR(item.monthlyBudget || 0)} ({item.budgetUtilizationPercent}%)
                </span>
              ))}
            </div>
          )}
        </article>
      )}

      {/* Monthly Budget Planning Tab Section */}
      {showBudgetPlanningSection && (
        <article
          className="mm-stat-panel"
          data-testid="mm-monthly-budget-planner"
          style={{ marginBottom: '8px' }}
        >
          <div className="mm-stat-panel-header">
            <div>
              <h2 className="mm-stat-panel-title">
                <Target
                  size={18}
                  style={{
                    verticalAlign: 'middle',
                    marginRight: 8,
                    color: 'var(--accent)',
                  }}
                />
                Monthly Budget Planning &amp; Real-Time Progress ({selectedMonth})
              </h2>
              <p className="mm-section-desc" style={{ margin: '4px 0 0' }}>
                Set specific monetary limits (₹) for each spending category and visualize real-time utilization against your monthly plan
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div
                role="group"
                aria-label="Filter Budget Categories by Status"
                style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}
              >
                <button
                  type="button"
                  onClick={() => setBudgetFilterStatus('all')}
                  className={`mm-btn mm-btn-sm ${
                    budgetFilterStatus === 'all' ? 'mm-btn-primary' : 'mm-btn-secondary'
                  }`}
                  data-testid="mm-budget-filter-all"
                >
                  All ({monthlyBudgetPlan.items.length})
                </button>
                <button
                  type="button"
                  onClick={() => setBudgetFilterStatus('over')}
                  className={`mm-btn mm-btn-sm ${
                    budgetFilterStatus === 'over' ? 'mm-btn-primary' : 'mm-btn-secondary'
                  }`}
                  data-testid="mm-budget-filter-over"
                >
                  Over Budget ({monthlyBudgetPlan.overBudgetCount})
                </button>
                <button
                  type="button"
                  onClick={() => setBudgetFilterStatus('near')}
                  className={`mm-btn mm-btn-sm ${
                    budgetFilterStatus === 'near' ? 'mm-btn-primary' : 'mm-btn-secondary'
                  }`}
                  data-testid="mm-budget-filter-near"
                >
                  Near Limit ({monthlyBudgetPlan.nearLimitCount})
                </button>
                <button
                  type="button"
                  onClick={() => setBudgetFilterStatus('on-track')}
                  className={`mm-btn mm-btn-sm ${
                    budgetFilterStatus === 'on-track' ? 'mm-btn-primary' : 'mm-btn-secondary'
                  }`}
                  data-testid="mm-budget-filter-ontrack"
                >
                  On Track ({monthlyBudgetPlan.onTrackCount})
                </button>
                {monthlyBudgetPlan.unbudgetedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setBudgetFilterStatus('unbudgeted')}
                    className={`mm-btn mm-btn-sm ${
                      budgetFilterStatus === 'unbudgeted' ? 'mm-btn-primary' : 'mm-btn-secondary'
                    }`}
                    data-testid="mm-budget-filter-unbudgeted"
                  >
                    Unbudgeted ({monthlyBudgetPlan.unbudgetedCount})
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleAutoAllocate503020}
                className="mm-btn mm-btn-sm mm-btn-secondary"
                title="Allocate 50% Fixed Needs / 30% Variable Wants / 20% Savings based on monthly income"
                data-testid="mm-budget-auto-503020-btn"
              >
                <PiggyBank size={13} />
                <span>50/30/20 Smart Plan</span>
              </button>

              <button
                type="button"
                onClick={handleAutoAllocateWithBuffer}
                className="mm-btn mm-btn-sm mm-btn-secondary"
                title="Auto-adjust limits to cover current monthly spend plus a 10% buffer"
                data-testid="mm-budget-auto-buffer-btn"
              >
                <TrendingUp size={13} />
                <span>Auto-Fit +10% Buffer</span>
              </button>

              <button
                type="button"
                onClick={handleResetDefaultThresholds}
                className="mm-btn mm-btn-sm mm-btn-ghost"
                title="Reset all category limits to recommended defaults"
                data-testid="mm-budget-planner-reset-btn"
              >
                <RotateCcw size={13} />
                <span>Reset Defaults</span>
              </button>
            </div>
          </div>

          {/* Top-level Monthly Budget Summary KPI Strip */}
          <div
            className="mm-budget-planner-summary"
            data-testid="mm-budget-summary-strip"
          >
            <div className="mm-budget-kpi-card">
              <span className="mm-budget-kpi-label">Total Monthly Budget Planned</span>
              <strong
                className="mm-budget-kpi-value"
                data-testid="mm-budget-total-planned"
              >
                {formatINR(monthlyBudgetPlan.totalBudgeted)}
              </strong>
              <span className="mm-budget-kpi-sub">
                Across {monthlyBudgetPlan.items.length - monthlyBudgetPlan.unbudgetedCount} budgeted expense categories
              </span>
            </div>

            <div className="mm-budget-kpi-card">
              <span className="mm-budget-kpi-label">Actual Spent vs Budget</span>
              <strong
                className="mm-budget-kpi-value"
                style={{
                  color:
                    monthlyBudgetPlan.totalSpent > monthlyBudgetPlan.totalBudgeted &&
                    monthlyBudgetPlan.totalBudgeted > 0
                      ? '#ef4444'
                      : 'var(--text-heading)',
                }}
                data-testid="mm-budget-total-spent"
              >
                {formatINR(monthlyBudgetPlan.totalSpent)}{' '}
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                  ({monthlyBudgetPlan.overallUtilizationPercent}%)
                </span>
              </strong>
              <span className="mm-budget-kpi-sub">
                {monthlyBudgetPlan.overBudgetCount > 0
                  ? `${monthlyBudgetPlan.overBudgetCount} category limit(s) exceeded`
                  : 'All categories within planned limits'}
              </span>
            </div>

            <div className="mm-budget-kpi-card">
              <span className="mm-budget-kpi-label">Remaining Budget Headroom</span>
              <strong
                className="mm-budget-kpi-value"
                style={{ color: '#10b981' }}
                data-testid="mm-budget-total-remaining"
              >
                {formatINR(monthlyBudgetPlan.totalRemaining)}
              </strong>
              <span className="mm-budget-kpi-sub">
                {monthlyBudgetPlan.totalOverage > 0
                  ? `+${formatINR(monthlyBudgetPlan.totalOverage)} total overage in exceeded categories`
                  : 'Available unspent allocation'}
              </span>
            </div>

            <div className="mm-budget-kpi-card">
              <span className="mm-budget-kpi-label">Unallocated Monthly Income</span>
              <strong
                className="mm-budget-kpi-value"
                style={{ color: 'var(--accent)' }}
                data-testid="mm-budget-unallocated-income"
              >
                {formatINR(unallocatedIncome)}
              </strong>
              <span className="mm-budget-kpi-sub">
                From {formatINR(metrics.income)} total inflow in {selectedMonth}
              </span>
            </div>
          </div>

          {/* Master Overall Monthly Budget Utilization Bar */}
          <div
            className="mm-budget-master-bar-card"
            data-testid="mm-budget-master-progress"
          >
            <div className="mm-budget-master-header">
              <span>
                <strong>Overall Monthly Budget Execution</strong> — {formatINR(monthlyBudgetPlan.totalSpent)} spent of{' '}
                {formatINR(monthlyBudgetPlan.totalBudgeted)} planned
              </span>
              <span
                className={`mm-budget-status-pill is-${
                  monthlyBudgetPlan.overallUtilizationPercent > 100
                    ? 'over'
                    : monthlyBudgetPlan.overallUtilizationPercent >= 85
                    ? 'near'
                    : 'on-track'
                }`}
              >
                {monthlyBudgetPlan.overallUtilizationPercent}% Utilized
              </span>
            </div>
            <div className="mm-budget-progress-track is-master">
              <div
                className="mm-budget-progress-fill"
                style={{
                  width: `${Math.min(100, monthlyBudgetPlan.overallUtilizationPercent)}%`,
                  backgroundColor:
                    monthlyBudgetPlan.overallUtilizationPercent > 100
                      ? '#ef4444'
                      : monthlyBudgetPlan.overallUtilizationPercent >= 85
                      ? '#f59e0b'
                      : '#10b981',
                }}
              />
            </div>
          </div>

          {/* Fixed Needs vs. Variable Wants Real-Time Budget Split */}
          <div
            className="mm-stats-two-col"
            style={{ marginBottom: 14, gap: 12 }}
            data-testid="mm-budget-fixed-vs-variable"
          >
            <div className="mm-budget-master-bar-card" style={{ marginBottom: 0 }}>
              <div className="mm-budget-master-header">
                <span>
                  <strong>Fixed Obligations Budget</strong> ({formatINR(monthlyBudgetPlan.fixedSpent)} /{' '}
                  {formatINR(monthlyBudgetPlan.fixedBudgeted)})
                </span>
                <span
                  className={`mm-budget-status-pill is-${
                    monthlyBudgetPlan.fixedUtilizationPercent > 100
                      ? 'over'
                      : monthlyBudgetPlan.fixedUtilizationPercent >= 85
                      ? 'near'
                      : 'on-track'
                  }`}
                  data-testid="mm-budget-fixed-utilization"
                >
                  {monthlyBudgetPlan.fixedUtilizationPercent}%
                </span>
              </div>
              <div className="mm-budget-progress-track">
                <div
                  className="mm-budget-progress-fill"
                  style={{
                    width: `${Math.min(100, monthlyBudgetPlan.fixedUtilizationPercent)}%`,
                    backgroundColor:
                      monthlyBudgetPlan.fixedUtilizationPercent > 100
                        ? '#ef4444'
                        : '#6366f1',
                  }}
                />
              </div>
            </div>

            <div className="mm-budget-master-bar-card" style={{ marginBottom: 0 }}>
              <div className="mm-budget-master-header">
                <span>
                  <strong>Variable Discretionary Budget</strong> ({formatINR(monthlyBudgetPlan.variableSpent)} /{' '}
                  {formatINR(monthlyBudgetPlan.variableBudgeted)})
                </span>
                <span
                  className={`mm-budget-status-pill is-${
                    monthlyBudgetPlan.variableUtilizationPercent > 100
                      ? 'over'
                      : monthlyBudgetPlan.variableUtilizationPercent >= 85
                      ? 'near'
                      : 'on-track'
                  }`}
                  data-testid="mm-budget-variable-utilization"
                >
                  {monthlyBudgetPlan.variableUtilizationPercent}%
                </span>
              </div>
              <div className="mm-budget-progress-track">
                <div
                  className="mm-budget-progress-fill"
                  style={{
                    width: `${Math.min(100, monthlyBudgetPlan.variableUtilizationPercent)}%`,
                    backgroundColor:
                      monthlyBudgetPlan.variableUtilizationPercent > 100
                        ? '#ef4444'
                        : '#06b6d4',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Real-Time Planned Budget vs. Actual Spend Comparison Bar Chart */}
          <div
            className="mm-budget-master-bar-card"
            style={{ marginBottom: 14 }}
            data-testid="mm-budget-vs-actual-panel"
          >
            <div
              className="mm-budget-master-header"
              style={{ marginBottom: showBudgetComparisonChart ? 10 : 0 }}
            >
              <div>
                <strong>Planned Budget vs. Real-Time Spend by Category</strong>
                <span className="mm-stat-panel-sub" style={{ marginLeft: 8 }}>
                  Updates live as you adjust category monetary limits below
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowBudgetComparisonChart((prev) => !prev)}
                className="mm-btn mm-btn-sm mm-btn-ghost"
                data-testid="mm-toggle-budget-chart-btn"
              >
                {showBudgetComparisonChart ? 'Hide Chart' : 'Show Chart'}
              </button>
            </div>

            {showBudgetComparisonChart && (
              <div
                style={{ width: '100%', height: 240 }}
                data-testid="mm-budget-vs-actual-chart"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlyBudgetPlan.items}
                    margin={{ top: 8, right: 16, left: 4, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.16)" />
                    <XAxis
                      dataKey="category"
                      stroke="var(--muted)"
                      fontSize={11}
                      interval={0}
                      angle={-12}
                      textAnchor="end"
                    />
                    <YAxis
                      stroke="var(--muted)"
                      fontSize={11}
                      tickFormatter={(val: number) => `₹${Math.round(val / 1000)}k`}
                    />
                    <RechartsTooltip
                      formatter={(value: number, name: string) => [formatINR(value), name]}
                      contentStyle={{
                        backgroundColor: 'var(--surface)',
                        borderColor: 'var(--border)',
                        borderRadius: '10px',
                        color: 'var(--text)',
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="monthlyLimit"
                      name="Planned Limit (₹)"
                      fill="rgba(148, 163, 184, 0.45)"
                      radius={[5, 5, 0, 0]}
                    />
                    <Bar
                      dataKey="spent"
                      name="Actual Spent (₹)"
                      radius={[5, 5, 0, 0]}
                    >
                      {monthlyBudgetPlan.items.map((entry) => (
                        <Cell
                          key={entry.category}
                          fill={
                            entry.status === 'over'
                              ? '#ef4444'
                              : entry.status === 'near'
                              ? '#f59e0b'
                              : entry.color
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Search & Sort Controls for Per-Category Budget Cards */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              flexWrap: 'wrap',
              marginBottom: 12,
            }}
            data-testid="mm-budget-search-sort-bar"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 240px' }}>
              <input
                type="search"
                value={budgetSearchQuery}
                onChange={(e) => setBudgetSearchQuery(e.target.value)}
                placeholder="Filter budget categories by name or Fixed/Variable..."
                className="mm-input"
                style={{ maxWidth: 340, padding: '6px 12px', fontSize: '0.84rem' }}
                aria-label="Search budget categories"
                data-testid="mm-budget-search-input"
              />
              {budgetSearchQuery && (
                <button
                  type="button"
                  onClick={() => setBudgetSearchQuery('')}
                  className="mm-btn mm-btn-sm mm-btn-ghost"
                  data-testid="mm-budget-search-clear"
                >
                  Clear
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label
                htmlFor="mm-budget-sort-select"
                style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}
              >
                Sort categories:
              </label>
              <select
                id="mm-budget-sort-select"
                value={budgetSortBy}
                onChange={(e) => setBudgetSortBy(e.target.value as BudgetSortOption)}
                className="mm-input"
                style={{ width: 'auto', padding: '5px 10px', fontSize: '0.82rem' }}
                data-testid="mm-budget-sort-select"
              >
                <option value="utilization-desc">Highest Utilization %</option>
                <option value="spent-desc">Highest Actual Spend (₹)</option>
                <option value="limit-desc">Highest Budget Limit (₹)</option>
                <option value="name-asc">Category Name (A–Z)</option>
              </select>
            </div>
          </div>

          {/* Per-Category Budget Planning Cards & Real-Time Progress Bars */}
          <div className="mm-budget-plan-grid" data-testid="mm-budget-plan-grid">
            {filteredBudgetPlanItems.map((item) => {
              const fillPct = Math.min(100, Math.round(item.utilizationPercent));
              const barColor =
                item.status === 'over'
                  ? '#ef4444'
                  : item.status === 'near'
                  ? '#f59e0b'
                  : item.color;
              const sliderMax = Math.max(
                30000,
                Math.ceil((Math.max(item.monthlyLimit, item.spent) * 1.5) / 5000) * 5000
              );

              return (
                <div
                  key={item.category}
                  className={`mm-budget-plan-card ${
                    item.status === 'over'
                      ? 'is-over'
                      : item.status === 'near'
                      ? 'is-near'
                      : ''
                  }`}
                  data-testid={`mm-budget-plan-row-${item.category}`}
                  data-over-budget={item.status === 'over' ? 'true' : 'false'}
                >
                  <div className="mm-budget-plan-top">
                    <div className="mm-budget-plan-cat-info">
                      <span
                        className="mm-legend-dot"
                        style={{
                          backgroundColor: item.color,
                          width: 12,
                          height: 12,
                          flexShrink: 0,
                        }}
                      />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          {item.status === 'over' && (
                            <AlertTriangle
                              size={14}
                              style={{ color: '#ef4444', flexShrink: 0 }}
                              aria-label={`${item.category} is over budget`}
                              data-testid={`mm-budget-plan-warning-icon-${item.category}`}
                            />
                          )}
                          <strong className="mm-budget-plan-cat-name">{item.category}</strong>
                          <span
                            className={`mm-tx-fv-tag ${
                              item.defaultFixedOrVariable === 'Fixed'
                                ? 'mm-fv-fixed'
                                : 'mm-fv-variable'
                            }`}
                          >
                            {item.defaultFixedOrVariable}
                          </span>
                        </div>
                        <span
                          className="mm-budget-plan-tx-meta"
                          data-testid={`mm-budget-plan-share-${item.category}`}
                        >
                          {item.txCount} {item.txCount === 1 ? 'transaction' : 'transactions'} ·{' '}
                          {item.shareOfTotalBudgetPercent}% of total budget
                          {item.remaining > 0
                            ? ` · ${formatINR(item.dailySafeSpend)}/day safe`
                            : ''}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`mm-budget-status-pill is-${item.status}`}
                      data-testid={`mm-budget-plan-status-${item.category}`}
                    >
                      {item.status === 'over' ? (
                        <>
                          <AlertTriangle size={11} /> Over by {formatINR(item.overage)}
                        </>
                      ) : item.status === 'near' ? (
                        <>Near Limit ({item.utilizationPercent}%)</>
                      ) : item.status === 'on-track' ? (
                        <>
                          <CheckCircle2 size={11} /> On Track ({item.utilizationPercent}%)
                        </>
                      ) : (
                        <>Unbudgeted</>
                      )}
                    </span>
                  </div>

                  {/* Editable Monetary Limit Controls */}
                  <div className="mm-budget-plan-limit-row">
                    <label
                      htmlFor={`mm-budget-limit-${item.categoryId}`}
                      className="mm-budget-limit-label"
                    >
                      Monthly Limit (₹):
                    </label>
                    <div className="mm-budget-limit-controls">
                      <button
                        type="button"
                        onClick={() =>
                          handleStepCategoryBudget(item.category, item.monthlyLimit, -1000)
                        }
                        className="mm-budget-step-btn"
                        title={`Decrease ${item.category} budget by ₹1,000`}
                        aria-label={`Decrease ${item.category} budget by ₹1,000`}
                        data-testid={`mm-budget-plan-dec-${item.category}`}
                      >
                        <Minus size={12} />
                      </button>
                      <input
                        id={`mm-budget-limit-${item.categoryId}`}
                        type="number"
                        min="0"
                        step="500"
                        placeholder="Set limit"
                        value={item.monthlyLimit || ''}
                        onChange={(e) =>
                          handleCategoryThresholdChange(item.category, e.target.value)
                        }
                        className="mm-input mm-budget-limit-input"
                        aria-label={`Monthly budget limit for ${item.category}`}
                        data-testid={`mm-budget-plan-input-${item.category}`}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          handleStepCategoryBudget(item.category, item.monthlyLimit, 1000)
                        }
                        className="mm-budget-step-btn"
                        title={`Increase ${item.category} budget by ₹1,000`}
                        aria-label={`Increase ${item.category} budget by ₹1,000`}
                        data-testid={`mm-budget-plan-inc-${item.category}`}
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Interactive Range Slider + Quick Limit Presets */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      marginBottom: 8,
                    }}
                  >
                    <input
                      type="range"
                      min="0"
                      max={sliderMax}
                      step="500"
                      value={item.monthlyLimit}
                      onChange={(e) =>
                        handleCategoryThresholdChange(item.category, e.target.value)
                      }
                      aria-label={`Budget slider for ${item.category}`}
                      style={{ width: '100%', accentColor: item.color, cursor: 'pointer' }}
                      data-testid={`mm-budget-plan-slider-${item.category}`}
                    />
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        flexWrap: 'wrap',
                      }}
                    >
                      {[3000, 5000, 10000, 20000].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() =>
                            handleCategoryThresholdChange(item.category, String(preset))
                          }
                          className="mm-btn mm-btn-sm mm-btn-ghost"
                          style={{
                            padding: '2px 7px',
                            fontSize: '0.72rem',
                            border:
                              item.monthlyLimit === preset
                                ? '1px solid var(--accent)'
                                : '1px solid var(--border)',
                          }}
                          data-testid={`mm-budget-preset-${item.category}-${preset}`}
                        >
                          ₹{preset / 1000}k
                        </button>
                      ))}
                      {item.spent > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            handleCategoryThresholdChange(
                              item.category,
                              String(Math.ceil(item.spent / 500) * 500)
                            )
                          }
                          className="mm-btn mm-btn-sm mm-btn-ghost"
                          style={{
                            padding: '2px 7px',
                            fontSize: '0.72rem',
                            border: '1px solid var(--border)',
                          }}
                          title="Match current monthly spend rounded to nearest ₹500"
                          data-testid={`mm-budget-match-spent-${item.category}`}
                        >
                          Match Spent
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Real-Time Progress Bar */}
                  <div
                    className="mm-budget-progress-track"
                    data-testid={`mm-budget-plan-progress-${item.category}`}
                  >
                    <div
                      className="mm-budget-progress-fill"
                      style={{
                        width: `${item.monthlyLimit > 0 ? fillPct : 0}%`,
                        backgroundColor: barColor,
                      }}
                      data-testid={`mm-budget-plan-progress-fill-${item.category}`}
                    />
                  </div>

                  {/* Bottom Spent vs Remaining / Overage Details */}
                  <div className="mm-budget-plan-bottom">
                    <span>
                      Spent: <strong>{formatINR(item.spent)}</strong>
                      {item.monthlyLimit > 0 ? ` / ${formatINR(item.monthlyLimit)}` : ''}
                    </span>
                    <span
                      className={
                        item.status === 'over'
                          ? 'mm-budget-variance-over'
                          : 'mm-budget-variance-ok'
                      }
                      data-testid={`mm-budget-plan-variance-${item.category}`}
                    >
                      {item.status === 'over'
                        ? `+${formatINR(item.overage)} over limit`
                        : item.monthlyLimit > 0
                        ? `${formatINR(item.remaining)} remaining`
                        : 'Set a limit above'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      )}

      {showAnalyticsSections && (
        <>
          {/* Row 1: Category Donut Chart + 6-Month Income vs Expense Trend */}
          <div className="mm-stats-two-col mm-stats-grid-2">
            {/* Category Spending Donut Card + Budget Alert System */}
            <article className="mm-stat-panel" data-testid="mm-category-donut-panel">
              <div className="mm-stat-panel-header">
                <div>
                  <h2 className="mm-stat-panel-title">Category Spending &amp; Budget Alerts</h2>
                  <span className="mm-stat-panel-sub">
                    Total Expenses: <strong>{formatINR(metrics.expense)}</strong>
                  </span>
                </div>

                {exceededCategories.length > 0 ? (
                  <span
                    className="mm-budget-alert-count-pill is-danger"
                    data-testid="mm-budget-alert-count"
                  >
                    <AlertTriangle size={13} />
                    <span>
                      {exceededCategories.length} Over Threshold
                    </span>
                  </span>
                ) : (
                  <span
                    className="mm-budget-alert-count-pill is-ok"
                    data-testid="mm-budget-alert-count"
                  >
                    <CheckCircle2 size={13} />
                    <span>Within Thresholds</span>
                  </span>
                )}
              </div>

              {/* User-Defined Budget Threshold Controls */}
              <div
                className="mm-budget-threshold-bar"
                data-testid="mm-budget-threshold-controls"
              >
                <div className="mm-budget-threshold-input-group">
                  <label
                    htmlFor="mm-uniform-budget-threshold"
                    className="mm-budget-threshold-label"
                  >
                    <BellRing size={13} />
                    <span>Alert Threshold (₹):</span>
                  </label>
                  <input
                    id="mm-uniform-budget-threshold"
                    type="number"
                    min="0"
                    step="500"
                    value={uniformThresholdInput}
                    onChange={(e) => setUniformThresholdInput(e.target.value)}
                    placeholder="Per-category limits active (e.g. 5000)"
                    className="mm-input mm-budget-threshold-input"
                    aria-label="Category budget alert threshold"
                    data-testid="mm-budget-threshold-input"
                  />
                  {uniformThresholdInput && (
                    <button
                      type="button"
                      onClick={handleApplyUniformThresholdToAll}
                      className="mm-btn mm-btn-sm mm-btn-primary"
                      data-testid="mm-apply-uniform-threshold-btn"
                      title="Save this threshold across all expense categories"
                    >
                      Save to All
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleResetDefaultThresholds}
                    className="mm-btn mm-btn-sm mm-btn-ghost"
                    title="Reset category budget thresholds to defaults"
                    data-testid="mm-reset-budget-thresholds-btn"
                  >
                    <RotateCcw size={13} />
                    <span>Reset Limits</span>
                  </button>
                </div>
              </div>

              {/* Active Budget Alerts Banner when any category exceeds threshold */}
              {exceededCategories.length > 0 && (
                <div
                  className="mm-budget-alert-banner"
                  role="alert"
                  data-testid="mm-budget-alert-banner"
                >
                  <div className="mm-budget-alert-banner-header">
                    <AlertTriangle size={16} />
                    <strong>
                      Budget Threshold Exceeded ({exceededCategories.length}{' '}
                      {exceededCategories.length === 1 ? 'Category' : 'Categories'})
                    </strong>
                  </div>
                  <div className="mm-budget-alert-banner-list">
                    {exceededCategories.map((item) => (
                      <span
                        key={item.category}
                        className="mm-budget-alert-chip"
                        data-testid={`mm-budget-alert-chip-${item.category}`}
                      >
                        <strong>{item.category}:</strong> {formatINR(item.amount)} spent vs{' '}
                        {formatINR(item.monthlyBudget || 0)} limit (+
                        {formatINR(item.overBudgetAmount || 0)} over)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {categoryBreakdown.length === 0 ? (
                <div className="mm-empty-state" style={{ padding: '36px 16px' }}>
                  <p className="mm-empty-title">No expenses recorded in {selectedMonth}</p>
                </div>
              ) : (
                <div className="mm-donut-layout">
                  <div style={{ width: '100%', height: 240 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryBreakdown}
                          dataKey="amount"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          innerRadius={58}
                          outerRadius={90}
                          paddingAngle={3}
                        >
                          {categoryBreakdown.map((entry) => (
                            <Cell
                              key={entry.category}
                              fill={entry.color}
                              stroke={entry.isOverBudget ? '#ef4444' : 'none'}
                              strokeWidth={entry.isOverBudget ? 2.5 : 0}
                            />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(value: number) => [formatINR(value), 'Spent']}
                          contentStyle={{
                            backgroundColor: 'var(--surface)',
                            borderColor: 'var(--border)',
                            borderRadius: '10px',
                            color: 'var(--text)',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="mm-category-legend-list" data-testid="mm-category-legend-list">
                    {categoryBreakdown.map((item) => {
                      const isOver = Boolean(item.isOverBudget);
                      const isNear =
                        !isOver &&
                        typeof item.budgetUtilizationPercent === 'number' &&
                        item.budgetUtilizationPercent >= 85;
                      const thresholdVal =
                        item.monthlyBudget ?? categoryThresholds[item.category] ?? '';
                      const barWidth = item.monthlyBudget
                        ? Math.min(100, Math.round((item.amount / item.monthlyBudget) * 100))
                        : 0;

                      return (
                        <div
                          key={item.category}
                          className={`mm-category-legend-row ${
                            isOver ? 'is-over-budget' : isNear ? 'is-near-budget' : ''
                          }`}
                          data-testid={`mm-category-row-${item.category}`}
                          data-over-budget={isOver ? 'true' : 'false'}
                          data-category-color={item.color}
                        >
                          <div className="mm-category-row-top">
                            <div className="mm-category-legend-left">
                              <label
                                style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}
                                title={`Change custom chart color for ${item.category}`}
                              >
                                <input
                                  type="color"
                                  value={item.color}
                                  onChange={(e) =>
                                    handleInlineCategoryColorChange(item.category, e.target.value)
                                  }
                                  className="mm-sr-only"
                                  aria-label={`Custom color for ${item.category}`}
                                  data-testid={`mm-inline-color-picker-${item.category}`}
                                />
                                <span
                                  className="mm-color-swatch"
                                  style={{
                                    backgroundColor: item.color,
                                  }}
                                />
                              </label>
                              <span className="mm-category-legend-name">{item.category}</span>
                              <span className="mm-category-legend-pct">{item.percentage}%</span>
                              {isOver && (
                                <span
                                  className="mm-budget-alert-badge is-over"
                                  data-testid={`mm-over-budget-badge-${item.category}`}
                                >
                                  <AlertTriangle size={11} />
                                  <span>Over by {formatINR(item.overBudgetAmount || 0)}</span>
                                </span>
                              )}
                              {isNear && (
                                <span
                                  className="mm-budget-alert-badge is-near"
                                  data-testid={`mm-near-budget-badge-${item.category}`}
                                >
                                  <span>{item.budgetUtilizationPercent}% of limit</span>
                                </span>
                              )}
                            </div>

                            <strong
                              className={`mm-category-legend-amount ${
                                isOver ? 'mm-text-expense' : ''
                              }`}
                            >
                              {formatINR(item.amount)}
                            </strong>
                          </div>

                          {/* Per-Category Threshold Progress & Inline Threshold Input */}
                          <div className="mm-category-budget-meta">
                            <div className="mm-category-budget-bar-track">
                              <div
                                className={`mm-category-budget-bar-fill ${
                                  isOver ? 'is-over' : isNear ? 'is-near' : 'is-ok'
                                }`}
                                style={{
                                  width: `${barWidth}%`,
                                  background: isOver ? undefined : item.color,
                                }}
                              />
                            </div>

                            <div className="mm-category-threshold-inline">
                              <span className="mm-category-threshold-meta-text">
                                {item.monthlyBudget
                                  ? `${item.budgetUtilizationPercent}% of ${formatINR(
                                      item.monthlyBudget
                                    )}`
                                  : 'No limit set'}
                              </span>
                              <label className="mm-category-inline-limit-label">
                                <span>Limit ₹</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="500"
                                  value={thresholdVal}
                                  onChange={(e) =>
                                    handleCategoryThresholdChange(item.category, e.target.value)
                                  }
                                  className="mm-category-inline-limit-input"
                                  aria-label={`Monthly budget threshold for ${item.category}`}
                                  data-testid={`mm-category-threshold-input-${item.category}`}
                                />
                              </label>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </article>

            {/* Right Panel: Category Spending Bar Chart (Custom Colors) & 6-Month Trend Bar Chart */}
            <article className="mm-stat-panel" data-testid="mm-six-month-trend-panel">
              <div className="mm-stat-panel-header">
                <div>
                  <h2 className="mm-stat-panel-title">
                    {barChartMode === 'category'
                      ? 'Category Spending Bar Chart'
                      : '6-Month Income vs Expense Trend'}
                  </h2>
                  <span className="mm-stat-panel-sub">
                    <TrendingUp size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    {barChartMode === 'category'
                      ? 'Bars colored by each category’s custom assigned color'
                      : 'Transfers excluded from cash flow bars'}
                  </span>
                </div>

                <div style={{ display: 'inline-flex', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => setBarChartMode('category')}
                    className={`mm-btn mm-btn-sm ${
                      barChartMode === 'category' ? 'mm-btn-primary' : 'mm-btn-secondary'
                    }`}
                    data-testid="mm-bar-mode-category-btn"
                  >
                    By Category
                  </button>
                  <button
                    type="button"
                    onClick={() => setBarChartMode('trend')}
                    className={`mm-btn mm-btn-sm ${
                      barChartMode === 'trend' ? 'mm-btn-primary' : 'mm-btn-secondary'
                    }`}
                    data-testid="mm-bar-mode-trend-btn"
                  >
                    6-Month Trend
                  </button>
                </div>
              </div>

              {barChartMode === 'category' ? (
                <div
                  style={{ width: '100%', height: 290 }}
                  data-testid="mm-category-bar-chart"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={categoryBreakdown}
                      margin={{ top: 12, right: 12, left: 4, bottom: 24 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.18)" />
                      <XAxis
                        dataKey="category"
                        stroke="var(--muted)"
                        fontSize={11}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                      />
                      <YAxis
                        stroke="var(--muted)"
                        fontSize={11}
                        tickFormatter={(val: number) => `₹${Math.round(val / 1000)}k`}
                      />
                      <RechartsTooltip
                        formatter={(value: number, name: string) => [formatINR(value), name]}
                        contentStyle={{
                          backgroundColor: 'var(--surface)',
                          borderColor: 'var(--border)',
                          borderRadius: '10px',
                          color: 'var(--text)',
                        }}
                      />
                      <Legend />
                      <Bar dataKey="amount" name="Spent (INR)" radius={[6, 6, 0, 0]}>
                        {categoryBreakdown.map((entry) => (
                          <Cell
                            key={entry.category}
                            fill={entry.color}
                            stroke={entry.isOverBudget ? '#ef4444' : 'none'}
                            strokeWidth={entry.isOverBudget ? 2.5 : 0}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div
                  style={{ width: '100%', height: 290 }}
                  data-testid="mm-six-month-trend-chart"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={sixMonthTrend}
                      margin={{ top: 12, right: 12, left: 4, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.18)" />
                      <XAxis dataKey="label" stroke="var(--muted)" fontSize={12} />
                      <YAxis
                        stroke="var(--muted)"
                        fontSize={11}
                        tickFormatter={(val: number) => `₹${Math.round(val / 1000)}k`}
                      />
                      <RechartsTooltip
                        formatter={(value: number, name: string) => [formatINR(value), name]}
                        contentStyle={{
                          backgroundColor: 'var(--surface)',
                          borderColor: 'var(--border)',
                          borderRadius: '10px',
                          color: 'var(--text)',
                        }}
                      />
                      <Legend />
                      <Bar dataKey="income" name="Income" fill="#2563EB" radius={[5, 5, 0, 0]} />
                      <Bar dataKey="expense" name="Expenses" fill="#EF4444" radius={[5, 5, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </article>
          </div>

          {/* Row 2: Fixed vs Variable Expenditure Ratio Gauge */}
          <article
            className="mm-stat-panel"
            style={{ marginTop: '8px' }}
            data-testid="mm-fixed-variable-gauge"
          >
            <div className="mm-stat-panel-header">
              <div>
                <h2 className="mm-stat-panel-title">
                  Fixed vs Variable Expenditure Ratio Gauge
                </h2>
                <p className="mm-section-desc" style={{ margin: '4px 0 0' }}>
                  Tracks structural monthly obligations (Rent, Utilities, Tuition) against discretionary or variable spending
                </p>
              </div>

              {metrics.anomalyCount > 0 && (
                <div className="mm-anomaly-summary-banner">
                  <AlertTriangle size={15} />
                  <span>
                    {metrics.anomalyCount} Unbudgeted{' '}
                    {metrics.anomalyCount === 1 ? 'Spike' : 'Spikes'}:{' '}
                    <strong>{formatINR(metrics.anomalyTotal)}</strong>
                  </span>
                </div>
              )}
            </div>

            <div
              className="mm-ratio-gauge-track"
              aria-label="Fixed vs Variable Expense Gauge"
            >
              <div
                className="mm-ratio-segment is-fixed"
                style={{ width: `${metrics.expense > 0 ? metrics.fixedRatioPercent : 50}%` }}
                title={`Fixed: ${formatINR(metrics.fixedExpense)} (${metrics.fixedRatioPercent}%)`}
              />
              <div
                className="mm-ratio-segment is-variable"
                style={{
                  width: `${metrics.expense > 0 ? metrics.variableRatioPercent : 50}%`,
                }}
                title={`Variable: ${formatINR(metrics.variableExpense)} (${metrics.variableRatioPercent}%)`}
              />
            </div>

            <div className="mm-ratio-legend-grid">
              <div className="mm-ratio-stat-box">
                <span className="mm-ratio-label">
                  <span className="mm-color-swatch" style={{ backgroundColor: '#6366f1' }} />
                  Fixed Obligations ({metrics.fixedRatioPercent}%)
                </span>
                <strong className="mm-ratio-value">{formatINR(metrics.fixedExpense)}</strong>
              </div>

              <div className="mm-ratio-stat-box">
                <span className="mm-ratio-label">
                  <span className="mm-color-swatch" style={{ backgroundColor: '#f59e0b' }} />
                  Variable Spending ({metrics.variableRatioPercent}%)
                </span>
                <strong className="mm-ratio-value">{formatINR(metrics.variableExpense)}</strong>
              </div>

              <div className="mm-ratio-stat-box">
                <span className="mm-ratio-label">Monthly Net Savings Rate</span>
                <strong
                  className={`mm-ratio-value ${
                    metrics.savingsRate >= 20 ? 'mm-text-net-positive' : 'mm-text-expense'
                  }`}
                >
                  {metrics.savingsRate}% ({formatINR(metrics.netBalance, true)})
                </strong>
              </div>
            </div>
          </article>

          {/* Row 3: Sinking Funds / Annual Provisions Tracker */}
          <article
            className="mm-stat-panel"
            style={{ marginTop: '8px' }}
            data-testid="mm-sinking-funds-panel"
          >
            <div className="mm-stat-panel-header">
              <div>
                <h2 className="mm-stat-panel-title">
                  <PiggyBank
                    size={18}
                    style={{
                      verticalAlign: 'middle',
                      marginRight: 8,
                      color: 'var(--accent)',
                    }}
                  />
                  Sinking Funds &amp; Annual Provisions Tracker
                </h2>
                <p className="mm-section-desc" style={{ margin: '4px 0 0' }}>
                  Accrue monthly provisions for predictable annual milestones (School Fees, Eid / Festival, Insurance)
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddFund((prev) => !prev)}
                className="mm-btn mm-btn-secondary"
                data-testid="mm-toggle-add-sinking-fund-btn"
              >
                <Plus size={15} />
                <span>{showAddFund ? 'Cancel' : 'Add Provision Goal'}</span>
              </button>
            </div>

            {showAddFund && (
              <form
                onSubmit={handleCreateFund}
                className="mm-inline-form-card"
                style={{ marginBottom: '18px' }}
              >
                <div className="mm-form-grid-4">
                  <div className="mm-field">
                    <label htmlFor="mm-sf-name">Provision Name</label>
                    <input
                      id="mm-sf-name"
                      type="text"
                      required
                      placeholder="e.g., Car Insurance Renewal"
                      value={fundName}
                      onChange={(e) => setFundName(e.target.value)}
                      className="mm-input"
                    />
                  </div>
                  <div className="mm-field">
                    <label htmlFor="mm-sf-target">Target Amount (₹)</label>
                    <input
                      id="mm-sf-target"
                      type="number"
                      required
                      min="500"
                      value={fundTarget}
                      onChange={(e) => setFundTarget(e.target.value)}
                      className="mm-input"
                    />
                  </div>
                  <div className="mm-field">
                    <label htmlFor="mm-sf-monthly">Monthly Target (₹)</label>
                    <input
                      id="mm-sf-monthly"
                      type="number"
                      required
                      min="100"
                      value={fundMonthly}
                      onChange={(e) => setFundMonthly(e.target.value)}
                      className="mm-input"
                    />
                  </div>
                  <div className="mm-field">
                    <label htmlFor="mm-sf-accrued">Current Accrued (₹)</label>
                    <input
                      id="mm-sf-accrued"
                      type="number"
                      min="0"
                      value={fundAccrued}
                      onChange={(e) => setFundAccrued(e.target.value)}
                      className="mm-input"
                    />
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '8px',
                    marginTop: '12px',
                  }}
                >
                  <button type="submit" className="mm-btn mm-btn-primary">
                    Save Provision Fund
                  </button>
                </div>
              </form>
            )}

            <div className="mm-sinking-funds-grid">
              {sinkingFunds.map((fund) => {
                const pct =
                  fund.targetAmount > 0
                    ? Math.min(100, Math.round((fund.currentAccrued / fund.targetAmount) * 100))
                    : 0;
                const remaining = Math.max(0, fund.targetAmount - fund.currentAccrued);

                return (
                  <div
                    key={fund.id}
                    className="mm-sinking-fund-card"
                    data-testid={`mm-sf-card-${fund.id}`}
                  >
                    <div className="mm-sf-top">
                      <div>
                        <strong className="mm-sf-name">{fund.name}</strong>
                        <span className="mm-sf-monthly">
                          Monthly Provision Target: {formatINR(fund.monthlyTarget)}/mo
                        </span>
                      </div>
                      <span className="mm-sf-pct">{pct}%</span>
                    </div>

                    <div className="mm-sf-progress-track">
                      <div
                        className="mm-sf-progress-fill"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="mm-sf-bottom">
                      <div className="mm-sf-amounts">
                        <span>
                          Accrued: <strong>{formatINR(fund.currentAccrued)}</strong> /{' '}
                          {formatINR(fund.targetAmount)}
                        </span>
                        <span className="mm-sf-remaining">
                          {remaining > 0 ? `${formatINR(remaining)} remaining` : '✓ Fully Funded'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {remaining > 0 && (
                          <button
                            type="button"
                            onClick={() => handleAddMonthlyContribution(fund)}
                            className="mm-btn mm-btn-ghost"
                            style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                            title={`Add monthly provision of ${formatINR(fund.monthlyTarget)}`}
                            data-testid={`mm-sf-contribute-${fund.id}`}
                          >
                            <ArrowUpCircle size={13} />
                            <span>+{formatINR(fund.monthlyTarget)}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onDeleteSinkingFund(fund.id)}
                          className="mm-icon-action-btn is-danger"
                          title="Remove provision fund"
                          aria-label={`Delete ${fund.name}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        </>
      )}

      {/* Row 3.5: Category Manager & Custom Chart Colors */}
      {showCategoriesSection && (
        <CategoryManager
          categories={localCategories}
          onSaveCategory={handleSaveCategoryState}
          onDeleteCategory={handleDeleteCategoryState}
        />
      )}

      {/* Row 4: Scheduled Transactions View (Active Recurring Payment Rules) */}
      {showScheduledSection && (
        <article
          className="mm-stat-panel"
          style={{ marginTop: '8px' }}
          data-testid="mm-scheduled-transactions-view"
        >
          <div className="mm-stat-panel-header">
            <div>
              <h2 className="mm-stat-panel-title">
                <Repeat
                  size={18}
                  style={{
                    verticalAlign: 'middle',
                    marginRight: 8,
                    color: 'var(--accent)',
                  }}
                />
                Scheduled Transactions
              </h2>
              <p className="mm-section-desc" style={{ margin: '4px 0 0' }}>
                Active recurring payment rules with frequency, next occurrence date, and quick controls to pause or delete
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setShowPausedRules((prev) => !prev)}
                className="mm-btn mm-btn-sm mm-btn-secondary"
                data-testid="mm-scheduled-toggle-paused-btn"
              >
                {showPausedRules
                  ? `Showing All (${recurringRules.length})`
                  : `Active Only (${activeRecurringRules.length})`}
              </button>

              {onOpenRecurringScheduler && (
                <button
                  type="button"
                  onClick={onOpenRecurringScheduler}
                  className="mm-btn mm-btn-sm mm-btn-primary"
                  data-testid="mm-scheduled-open-scheduler-btn"
                >
                  <Plus size={14} />
                  <span>Manage Schedules</span>
                </button>
              )}
            </div>
          </div>

          {displayedRecurringRules.length === 0 ? (
            <div className="mm-empty-state" style={{ padding: '28px 16px' }}>
              <CalendarClock size={28} />
              <p className="mm-empty-title" style={{ margin: 0 }}>
                No active recurring payment rules found
              </p>
              {recurringRules.length > 0 && !showPausedRules && (
                <button
                  type="button"
                  onClick={() => setShowPausedRules(true)}
                  className="mm-btn mm-btn-sm mm-btn-secondary"
                >
                  Show {recurringRules.length} Paused Rule(s)
                </button>
              )}
            </div>
          ) : (
            <div className="mm-day-tx-list" data-testid="mm-scheduled-transactions-list">
              {displayedRecurringRules.map((rule) => {
                const sourceName = accountMap.get(rule.accountId) || rule.accountId;
                const targetName = rule.toAccountId
                  ? accountMap.get(rule.toAccountId) || rule.toAccountId
                  : null;

                return (
                  <div
                    key={rule.id}
                    className="mm-tx-row"
                    style={{
                      opacity: rule.active ? 1 : 0.65,
                    }}
                    data-testid={`mm-scheduled-rule-row-${rule.id}`}
                  >
                    <div className="mm-tx-left">
                      <div
                        className={`mm-tx-icon-wrap ${
                          rule.type === 'Income'
                            ? 'mm-tx-icon-income'
                            : rule.type === 'Expense'
                            ? 'mm-tx-icon-expense'
                            : 'mm-tx-icon-transfer'
                        }`}
                      >
                        <Repeat size={17} />
                      </div>

                      <div className="mm-tx-details">
                        <div className="mm-tx-title-line">
                          <strong className="mm-tx-category">{rule.title}</strong>
                          <span
                            className="mm-account-type-label"
                            data-testid={`mm-scheduled-freq-${rule.id}`}
                          >
                            {rule.frequency}
                          </span>
                          <span
                            className={`mm-tx-fv-tag ${
                              rule.fixedOrVariable === 'Fixed' ? 'mm-fv-fixed' : 'mm-fv-variable'
                            }`}
                          >
                            {rule.fixedOrVariable}
                          </span>
                          <span
                            className="mm-tx-subcategory"
                            data-testid={`mm-scheduled-status-${rule.id}`}
                            style={{
                              color: rule.active ? '#10b981' : '#f59e0b',
                              fontWeight: 700,
                            }}
                          >
                            {rule.active ? 'Active' : 'Paused'}
                          </span>
                        </div>

                        <div className="mm-tx-meta-line">
                          <span className="mm-tx-account-badge">
                            {sourceName}
                            {rule.type === 'Transfer' && targetName ? (
                              <>
                                {' '}
                                <ArrowRight size={11} style={{ display: 'inline' }} /> {targetName}
                              </>
                            ) : null}
                          </span>
                          <span>
                            {rule.category}
                            {rule.subCategory ? ` · ${rule.subCategory}` : ''}
                          </span>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontWeight: 600,
                              color: 'var(--text-heading)',
                            }}
                            data-testid={`mm-scheduled-next-date-${rule.id}`}
                          >
                            <Clock size={12} />
                            Next occurrence: {rule.nextRunDate}
                            {rule.timeOfDay ? ` at ${rule.timeOfDay}` : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mm-tx-right">
                      <strong
                        className={`mm-tx-amount ${
                          rule.type === 'Income'
                            ? 'mm-amount-income'
                            : rule.type === 'Expense'
                            ? 'mm-amount-expense'
                            : 'mm-amount-transfer'
                        }`}
                      >
                        {rule.type === 'Income' ? '+' : rule.type === 'Expense' ? '-' : '⇄ '}
                        {formatINR(rule.amount)}
                      </strong>

                      <div className="mm-tx-actions">
                        <button
                          type="button"
                          onClick={() => onToggleRecurringRule?.(rule)}
                          className="mm-btn mm-btn-sm mm-btn-secondary"
                          title={
                            rule.active
                              ? `Pause ${rule.title}`
                              : `Resume ${rule.title}`
                          }
                          aria-label={
                            rule.active
                              ? `Pause ${rule.title}`
                              : `Resume ${rule.title}`
                          }
                          data-testid={`mm-scheduled-pause-toggle-${rule.id}`}
                        >
                          {rule.active ? (
                            <>
                              <PauseCircle size={14} />
                              <span>Pause</span>
                            </>
                          ) : (
                            <>
                              <PlayCircle size={14} />
                              <span>Resume</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => onDeleteRecurringRule?.(rule.id)}
                          className="mm-icon-action-btn is-danger"
                          title={`Delete ${rule.title}`}
                          aria-label={`Delete ${rule.title}`}
                          data-testid={`mm-scheduled-delete-btn-${rule.id}`}
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
        </article>
      )}
    </section>
  );
};

export default StatsView;
